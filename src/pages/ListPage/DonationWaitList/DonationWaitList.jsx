import React, { useEffect, useRef, useState } from "react";
import useAsync from "../../../hooks/useAsync";
import { getDonationList } from "../../../api/donationsApi";
import Slider from "react-slick";
import TitleSection from "../../../components/TitleSection/TitleSection";
import Button from "../../../components/Button/Button.jsx";
import Card from "./DonationList/DonationCard.jsx";
import CaretButton from "../../../components/CaretButton/CaretButton.jsx";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useMyCredit } from "../../../context/MyCreditContext.jsx";
import Modal from "../../../components/Modal/Modal.jsx";
import DonationModal from "../../../components/Modal/Fandom-k_Modal/modal.js/DonationModal.js";
import ErrorSection from "../../../components/ErrorSection/ErrorSection.jsx";

const PAGE_SIZES = 999;

function DonationWaitList({ mode }) {
	const [myCredit, setMyCredit] = useMyCredit();
	const sliderRef = useRef(null);
	const [reload, setReload] = useState(0);
	const [idols, setIdols] = useState([]);
	const [cursor, setCursor] = useState(null);
	const [disableButton, setDisableButton] = useState(true);
	const [currentSlide, setCurrentSlide] = useState(0);
	const [visibleModal, setVisibleModal] = useState(false);
	const [currentIdol, setCurrentIdol] = useState(null); // 기본값 null로 변경
	const [creditValue, setCreditValue] = useState("");
	const [donationButtonDisabled, setDonationButtonDisabled] = useState(true);

	const [pending, error, execute] = useAsync(getDonationList);

	const getData = async ({ cursor }) => {
		const params = { pageSize: PAGE_SIZES * 2 };
		if (cursor) {
			params.pageSize = PAGE_SIZES;
			params.cursor = cursor;
		}

		const result = await execute(params);
		if (!result) return;
		const { list, nextCursor } = result;

		const sortedIdols = [...list].sort((a, b) => {
			const aIsEnded = a.receivedDonations >= a.targetDonation || new Date(a.deadline) < new Date();
			const bIsEnded = b.receivedDonations >= b.targetDonation || new Date(b.deadline) < new Date();
			if (aIsEnded && !bIsEnded) return 1;
			if (!aIsEnded && bIsEnded) return -1;
			return b.receivedDonations - a.receivedDonations;
		});

		setIdols((prev) => (cursor ? [...prev, ...sortedIdols] : sortedIdols));
		setCursor(nextCursor);
		setDisableButton(false);
	};

	const moreIdols = async (cursor) => {
		if (cursor) await getData({ cursor });
	};

	const handleReload = () => {
		setIdols([]);
		setReload((prev) => ++prev);
	};

	const slickFirst = () => sliderRef.current.slickGoTo(0);
	const slickPrev = () => sliderRef.current.slickPrev();
	const slickNext = async () => sliderRef.current.slickNext();

	const openModal = (item) => {
		setCurrentIdol(item);
		setVisibleModal(true);
	};

	const closeModal = () => {
		setCurrentIdol(null); // 모달 닫을 때 null로 설정
		setVisibleModal(false);
	};

	useEffect(() => {
		getData({ cursor: null });
	}, [reload]);

	const settings = {
		rows: 1,
		dots: false,
		arrows: false,
		speed: 500,
		slidesToScroll: 2,
		centerPadding: "0px",
		infinite: false,
		variableWidth: true,
		beforeChange: (oldIndex, newIndex) => {
			setDisableButton(true);
			if (newIndex > idols.length - 3) moreIdols(cursor);
			setCurrentSlide(newIndex);
		},
		afterChange: (index) => {
			setDisableButton(false);
		},
		responsive: [
			{
				breakpoint: 1200,
				settings: {
					arrows: false,
					draggable: true,
					slidesToScroll: 1,
					dots: true,
					centerMode: true,
					infinite: false,
				},
			},
		],
	};

	return (
		<>
			<TitleSection
				title={"후원을 기다리는 조공"}
				carousel={true}
				size={"normal"}
				action={
					<Button size={"small"} onClick={slickFirst} disabled={currentSlide === 0}>
						처음으로
					</Button>
				}
			>
				{error ? (
					<ErrorSection error={error} onReload={handleReload}></ErrorSection>
				) : (
					<>
						{pending && idols.length === 0 && (
							<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
								{Array.from({ length: 4 }, (v, i) => i).map((_, i) => {
									return <Card key={`skeleton-card-${i}`} item={"skeleton"} size={mode === "mobile" ? "small" : "medium"} style={{ margin: 0 }} />;
								})}
							</div>
						)}
						{idols.length === 0 && !pending ? (
							<p>진행중인 후원이 없습니다.</p>
						) : (
							<Slider ref={sliderRef} {...settings}>
								{idols.map((item) => (
									<div key={item.id} style={{ padding: "0 10px" }}>
										<Card key={item.id} item={item} onClick={() => openModal(item)} size={mode === "mobile" ? "small" : "medium"} />
									</div>
								))}
							</Slider>
						)}
						{mode === "desktop" && (
							<>
								{currentSlide !== 0 && <CaretButton direction="left" onClick={slickPrev} disabled={disableButton} />}
								{currentSlide < idols.length - 3 && <CaretButton direction="right" onClick={slickNext} disabled={disableButton} />}
							</>
						)}
					</>
				)}
			</TitleSection>
			{visibleModal && currentIdol && (
				<Modal title={"후원하기"} show={visibleModal} onClose={closeModal}>
					<DonationModal onClose={closeModal} icon={"credit"} idol={currentIdol} creditValueState={[creditValue, setCreditValue]} donationButtonDisabledState={[donationButtonDisabled, setDonationButtonDisabled]} disabled={donationButtonDisabled} buttonName={"후원하기"} />
				</Modal>
			)}
		</>
	);
}

export default DonationWaitList;
